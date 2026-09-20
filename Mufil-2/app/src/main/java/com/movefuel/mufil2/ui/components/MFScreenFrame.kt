package com.movefuel.mufil2.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.*
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun MFScreenFrame(
    id: String,
    title: String,
    subtitle: String,
    primaryLabel: String? = null,
    primaryRoute: MoveFuelRoute? = null,
    secondaryLabel: String? = null,
    secondaryRoute: MoveFuelRoute? = null,
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

    MFPremiumBackground {
        Column(
            Modifier
                .fillMaxSize()
                .alpha(alpha)
                .offset(y = y)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = MoveFuelSpacing.Base, vertical = MoveFuelSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Base),
        ) {
            MFTopBar()
            Text(id, color = MoveFuelColors.Sage, style = MaterialTheme.typography.labelMedium)
            Text(title, style = MaterialTheme.typography.displaySmall)
            Text(subtitle, color = MoveFuelColors.TextSecondary)
            content()
            primaryLabel?.let { label ->
                MFPrimaryButton(label) { primaryRoute?.let(onNavigate) }
            }
            if (secondaryLabel != null && secondaryRoute != null) {
                androidx.compose.material3.TextButton(
                    onClick = { onNavigate(secondaryRoute) },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(secondaryLabel) }
            }
            Spacer(Modifier.height(MoveFuelSpacing.Lg))
        }
    }
}
