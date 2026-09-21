package com.movefuel.mufil2.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.*
import com.movefuel.mufil2.ui.navigation.*

@Composable
fun MFScreenFrame(
    id: String,
    title: String,
    subtitle: String,
    primaryLabel: String? = null,
    primaryRoute: MoveFuelRoute? = null,
    secondaryLabel: String? = null,
    secondaryRoute: MoveFuelRoute? = null,
    primaryEnabled: Boolean = true,
    onNavigate: (MoveFuelRoute) -> Unit,
    content: @Composable () -> Unit,
) {
    var entered by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { entered = true }
    val alpha by animateFloatAsState(
        if (entered) 1f else 0f,
        animationSpec = MoveFuelMotion.enter(),
        label = "screenAlpha",
    )
    val y by animateDpAsState(
        if (entered) 0.dp else 18.dp,
        animationSpec = MoveFuelMotion.enter(),
        label = "screenOffset",
    )

    val shell = moveFuelShellFor(id)
    val primaryDestination = moveFuelPrimaryDestinationFor(id)
    val (resolvedPrimaryLabel, resolvedPrimaryRoute) =
        moveFuelPrimaryAction(id, primaryLabel, primaryRoute)
    val (resolvedSecondaryLabel, resolvedSecondaryRoute) =
        moveFuelSecondaryAction(id, secondaryLabel, secondaryRoute)
    val back = LocalMoveFuelBack.current
    val secondaryIsBack = resolvedSecondaryLabel.equals("Back", ignoreCase = true)
    val showBottomNav = shell == MoveFuelShell.MAIN

    MFPremiumBackground {
        Box(Modifier.fillMaxSize()) {
            Column(
                Modifier
                    .fillMaxSize()
                    .alpha(alpha)
                    .offset(y = y),
            ) {
                if (shell != MoveFuelShell.WEAR) {
                    Box(
                        Modifier.padding(
                            start = MoveFuelSpacing.Base,
                            end = MoveFuelSpacing.Base,
                            top = MoveFuelSpacing.Lg,
                        )
                    ) {
                        MFTopBar(
                            onBack = if (shell == MoveFuelShell.FOCUSED && secondaryIsBack) back else null,
                            onCalendar = if (shell == MoveFuelShell.MAIN) {
                                { onNavigate(MoveFuelRoute.CAL_001) }
                            } else null,
                            onProfile = if (shell == MoveFuelShell.MAIN) {
                                { onNavigate(MoveFuelRoute.PRO_001) }
                            } else null,
                        )
                    }
                }
                Column(
                    Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(
                            start = MoveFuelSpacing.Base,
                            end = MoveFuelSpacing.Base,
                            bottom = MoveFuelSpacing.Lg,
                        ),
                    verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Base),
                ) {
                    Spacer(Modifier.height(MoveFuelSpacing.Xs))
                    Text(id.replace("_", "-"), color = MoveFuelColors.Sage, style = MaterialTheme.typography.labelMedium)
                    Text(title, style = MaterialTheme.typography.displaySmall, color = MoveFuelColors.Text)
                    Text(subtitle, color = MoveFuelColors.TextSecondary)
                    content()

                    if (resolvedPrimaryLabel != null && resolvedPrimaryRoute != null) {
                        MFPrimaryButton(
                            text = resolvedPrimaryLabel,
                            onClick = { onNavigate(resolvedPrimaryRoute) },
                            enabled = primaryEnabled,
                        )
                    }

                    val backAlreadyInTopBar =
                        shell == MoveFuelShell.FOCUSED && secondaryIsBack
                    if (!backAlreadyInTopBar && resolvedSecondaryLabel != null) {
                        TextButton(
                            onClick = {
                                if (secondaryIsBack) {
                                    back()
                                } else {
                                    resolvedSecondaryRoute?.let(onNavigate)
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(resolvedSecondaryLabel)
                        }
                    }
                    Spacer(Modifier.height(MoveFuelSpacing.Lg))
                }
                if (showBottomNav) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = MoveFuelSpacing.Base, vertical = MoveFuelSpacing.Base)
                    ) {
                        MFBottomNav(primaryDestination?.label, onNavigate)
                    }
                }
            }
        }
    }
}
