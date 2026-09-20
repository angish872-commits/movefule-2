package com.movefuel.mufil2.ui.screens.sor

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SOR009SorenessHistoryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SOR_009",
        title = "Soreness History",
        subtitle = "Soreness body-map workflow; pain stays separate.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SOR_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_008,
        onNavigate = onNavigate,
    ) {
            MFListItem("Left quadriceps","Mild · today","Edit")
            MFListItem("Upper back","Moderate · yesterday","History")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SOR009SorenessHistoryScreenPreview() {
    MoveFuelTheme { SOR009SorenessHistoryScreen {} }
}
