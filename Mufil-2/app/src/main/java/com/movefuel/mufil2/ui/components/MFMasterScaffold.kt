package com.movefuel.mufil2.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelSpacing
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun MFMasterScaffold(
    active: String,
    title: String,
    subtitle: String,
    tabs: List<String>? = null,
    selectedTab: String? = null,
    onNavigate: (MoveFuelRoute) -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    MFPremiumBackground {
        Box(Modifier.fillMaxSize()) {
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(
                        start = MoveFuelSpacing.Base,
                        end = MoveFuelSpacing.Base,
                        top = MoveFuelSpacing.Lg,
                        bottom = 118.dp,
                    ),
                verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Base),
            ) {
                MFTopBar()
                Spacer(Modifier.height(MoveFuelSpacing.Xs))
                Text(title, style = MaterialTheme.typography.displaySmall, color = MoveFuelColors.Text)
                Text(subtitle, color = MoveFuelColors.TextSecondary)
                if (tabs != null && selectedTab != null) {
                    MFTabStrip(tabs, selectedTab)
                }
                content()
            }
            Box(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = MoveFuelSpacing.Base, vertical = MoveFuelSpacing.Base)
            ) {
                MFBottomNav(active, onNavigate)
            }
        }
    }
}
